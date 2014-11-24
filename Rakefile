samples = {
    "DDx" => "./DDx",    
    "Asteroids" => "./Asteroids", 
    "Scribble" => "./Scribble"
}

desc "Deploy all HTML5 clients"
task :deploy do
	samples.each do |name,sample|
        sh("cd #{sample} && rake deploy")
    end    
end